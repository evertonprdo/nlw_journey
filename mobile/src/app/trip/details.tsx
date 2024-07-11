import { useEffect, useState } from "react";
import { Alert, Text, View, FlatList } from "react-native";
import { Plus } from "lucide-react-native";

import { validateInput } from "@/utils/validateInput";
import { linksServer } from "@/server/links-server";
import { participantsServer } from "@/server/participants-server";

import { colors } from "@/styles/colors";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { Input } from "@/components/input";
import { TripLink, type TripLinkProps } from "@/components/tripLink"
import { Participant, type ParticipantProps } from "@/components/participant"

export function TripDetails({ tripId }: {tripId: string}) {
    // MODAL
    const [ showNewLinkModal, setShowNewLinkModal ] = useState(false); // Controlador do modal

    // LOADING
    const [ isCreatingLinkTrip, setIsCreatingLinkTrip ] = useState(false) // Await de criar link

    // LIST
    const [ links, setLinks ] = useState<TripLinkProps[]>([]) // A lista de links
    const [ participants, setParticipants ] = useState<ParticipantProps[]>([]) // A Lista de participants

    // DATA
    const [ linkTitle, setLinkTitle ] = useState("") // Campo do input para novo link
    const [ linkURL, setLinkURL ] = useState("") // Campo do input para novo link

    function resetNewLinkFields() {
        setLinkTitle("")
        setLinkURL("")
        setShowNewLinkModal(false)
    }

    async function handleCreateTripLink() { // Request para criar novo link
        try {
            if(!linkTitle.trim()) {
                return Alert.alert("Link", "Informe um título para o link!")
            }
            if(!validateInput.url(linkURL.trim())) {
                return Alert.alert("Link", "Link inválido!")
            }
            
            setIsCreatingLinkTrip(true)

            await linksServer.create({
                tripId,
                title: linkTitle,
                url: linkURL
            })

            Alert.alert("Link", "Link criado com sucesso!")
            resetNewLinkFields()
            await getTripLinks()
        } catch (error) {
            console.log(error)
        } finally {
            setIsCreatingLinkTrip(false)
        }
    }

    async function getTripLinks() { // Request para pegar a lista de itens
        try {
            const links = await linksServer.getLinksByTripId(tripId)
            setLinks(links)
        } catch (error) {
            console.log(error);
        } finally {

        }
    }

    async function getTripParticipants() { // Request para pegar a lista de participantes
        try {
            const participants = await participantsServer.getByTripId(tripId)
            setParticipants(participants)
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        getTripLinks()
        getTripParticipants()
    },[])


    /**
     * Links
     * 
     * if has items <FlatList com render item <TripLink/> />
     * 
     * <Button -> <Modal novo link/> />
     * 
     * <Participants FlatList />
     * 
     * <Modal novo link />
     */
    return (
        <View className="flex-1 mt-10">
            <Text className="text-zinc-50 text-2xl font-semibold mb-2">
                Links importantes
            </Text>

            <View className="flex-1">
                { links.length > 0 ? (
                    <FlatList 
                        data={links}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <TripLink data={item}/>}
                        contentContainerClassName="gap-4"
                    />
                ) : (
                    <Text className="text-zinc-400 font-regular text-base mt-2 mb-6">
                        Nenhum link adicionado
                    </Text>
                )}

                <Button 
                    variant="secondary"
                    onPress={() => setShowNewLinkModal(true)}
                >
                    <Plus color={colors.zinc[200]} size={20}/>
                    <Button.Title>Cadastrar novo link</Button.Title>
                </Button>
            </View>

            <View className="flex-1 border-t border-zinc-800 mt-6">
                <Text className="text-zinc-50 text-2xl font-semibold my-6">
                    Convidados
                </Text>

                <FlatList 
                    data={participants}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <Participant  data={item} />}
                    contentContainerClassName="gap-4 pb-44"
                />
            </View>

            <Modal
                title="Cadastrar link"
                subtitle="Todos os convidados podem visualizar os links importantes"
                visible={ showNewLinkModal }
                onClose={() => setShowNewLinkModal(false)}
            >
                <View className="gap-2 mb-3">
                    <Input variant="secondary">
                        <Input.Field 
                            placeholder="Título do link"
                            onChangeText={ setLinkTitle }
                        />
                    </Input>

                    <Input variant="secondary">
                        <Input.Field 
                            placeholder="URL"
                            onChangeText={ setLinkURL }
                        />
                    </Input>
                </View>

                <Button
                    isLoading= { isCreatingLinkTrip }
                    onPress= { handleCreateTripLink }
                >
                    <Button.Title>Salvar link</Button.Title>
                </Button>
            </Modal>
        </View>
    )
}