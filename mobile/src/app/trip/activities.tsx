import { useState, useEffect } from "react";
import { Alert, Keyboard, Text, View, SectionList } from "react-native";
import dayjs from "dayjs";

import { PlusIcon, Tag, Calendar as IconCalendar, Clock } from "lucide-react-native"

import { type TripData } from "./[id]"
import { Activity, type ActivityProps } from "@/components/activity";
import { activitiesServer } from "@/server/activities-server";

import { colors } from "@/styles/colors";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { Input } from "@/components/input";
import { Calendar } from "@/components/calendar";
import { Loading } from "@/components/loading";

type Props = {
    tripDetails: TripData
}

enum MODAL {
    NONE = 0,
    CALENDAR = 1,
    NEW_ACTIVITY = 2
}

type TripActivitiesProps = {
    title: {
        dayNumber: number
        dayName: string
    }
    data: ActivityProps[]
}

export function TripActivities({ tripDetails }: Props) {
    // MODAL
    const [ showModal, setShowModal ] = useState(MODAL.NONE)

    // LOADING
    const [ isCreatingActivity, setIsCreatingActivity ] = useState(false)
    const [ isLoadingActivities, setIsLoadingActivities ] = useState(true)

    // DATA
    const [ activityTitle, setActivityTitle ] = useState("")
    const [ activityDate, setActivityDate ] = useState("")
    const [ activityHour, setActivityHour ] = useState("")

    // LIST
    const [ tripActivities, setTripActivities ] = useState<TripActivitiesProps[]>([])

    function resetNewActivityFields() {
        setActivityTitle("")
        setActivityDate("")
        setActivityHour("")
        setShowModal(MODAL.NONE)
    }

    async function handleCreateTripActivity() {
        try {
            if(!activityTitle || !activityDate || !activityHour) {
                return Alert.alert("Cadastrar atividade", "Preencha todos os campos!")
            }

            setIsCreatingActivity(true)

            await activitiesServer.create({
                tripId: tripDetails.id,
                occurs_at: dayjs(activityDate).add(Number(activityHour), "h").toString(),
                title: activityTitle
            })

            Alert.alert("Nova atividade", "Nova atividade cadastrada com sucesso!")

            await getTripActivities()
            resetNewActivityFields()
        } catch (err) {
            console.log(err);
        } finally {
            setIsCreatingActivity(false)
        }
    }

    async function getTripActivities() {
        try {
            const activities = await activitiesServer.getActivitiesByTripId(tripDetails.id)
           
            const activitiesToSectionList = activities.map((dayActivitie) => ({
                title: {
                    dayNumber: dayjs(dayActivitie.date).date(),
                    dayName: dayjs(dayActivitie.date).format("dddd").replace("-feira", ""),
                },
                data: dayActivitie.activities.map(( activity ) => ({
                    id: activity.id,
                    title: activity.title,
                    hour: dayjs(activity.occurs_at).format("HH[:]mm[h]"),
                    isBefore: dayjs(activity.occurs_at).isBefore(dayjs())
                }))
            }))
            
            setTripActivities(activitiesToSectionList)
        } catch (error) {
            console.log(error)
        } finally {
            setIsLoadingActivities(false)
        }
    }

    useEffect(() => {
        getTripActivities()
    }, [])

    return (
        <View className="flex-1">
            <View className="w-full flex-row mt-5 mb-6 items-center">
                <Text className="text-zinc-50 text-2xl font-semibold flex-1">
                    Atividades
                </Text>

                <Button
                    onPress={() => setShowModal(MODAL.NEW_ACTIVITY)}
                >
                    <PlusIcon color={colors.lime[950]} />
                    <Button.Title>Nova Atividade</Button.Title>
                </Button>
            </View>
            
            { isLoadingActivities ? <Loading /> : (

                <SectionList 
                    sections={tripActivities}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <Activity data={item} />}
                    renderSectionHeader={({ section }) => (
                        <View className="w-full">
                            <Text className="text-zinc-50 text-2xl font-semibold py-2">
                                Dia {section.title.dayNumber + " "}
                                
                                <Text className="text-zinc-500 text-base font-regular capitalize">
                                    {section.title.dayName}
                                </Text>
                            </Text>

                            {
                                section.data.length === 0 && (
                                    <Text className="text-zinc-500 font-regular text-sm mb-8">
                                        Nenhuma atividade cadastrada nessa data.
                                    </Text>
                                )
                            }
                        </View>
                    )}
                    contentContainerClassName="gap-3 pb-48"
                    showsVerticalScrollIndicator={false}
                />
            )}

            <Modal
                visible= {showModal === MODAL.NEW_ACTIVITY}
                title="Cadastrar Atividade"
                subtitle="Todos os convidados podem visualizar as atividades"
                onClose={() => setShowModal(MODAL.NONE)}
            >
                <View className="mt-4 mb-3">
                    <Input variant="secondary">
                        <Tag color={colors.zinc[400]} size= {20}/>
                        <Input.Field
                            placeholder="Qual atividade?"
                            onChangeText={ setActivityTitle }
                            value= { activityTitle }
                        />
                    </Input>

                    <View className="w-full mt-2 flex-row gap-2">
                        <Input
                            variant="secondary"
                            className="flex-1"
                        >
                            <IconCalendar color={colors.zinc[400]} size= {20}/>
                            <Input.Field
                                placeholder="Data?"
                                onChangeText={ setActivityTitle }
                                value= { activityDate ? dayjs(activityDate).format("DD [de] MMMM") : "" }
                                onFocus={() => Keyboard.dismiss()}
                                showSoftInputOnFocus= {false}
                                onPressIn={() => setShowModal(MODAL.CALENDAR)}
                            />
                        </Input>

                        <Input
                            variant="secondary"
                            className="flex-1"
                        >
                            <Clock color={colors.zinc[400]} size= {20}/>
                            <Input.Field
                                placeholder="Horário?"
                                onChangeText={(text) => setActivityHour(text.replace(".","").replace(",","")) }
                                value= { activityHour }
                                keyboardType="numeric"
                                maxLength={2}
                            />
                        </Input>
                    </View>
                </View>

                <Button
                    onPress={ handleCreateTripActivity }
                    isLoading={isCreatingActivity}
                >
                    <Button.Title>Salvar atividade</Button.Title>
                </Button>
            </Modal>

            <Modal
                title="Selecionar data"
                subtitle="Selecionar a data da atividade"
                visible= {showModal === MODAL.CALENDAR}
                onClose={() => setShowModal(MODAL.NONE)}
            >
                <View className="gap-4 mt-4">
                    <Calendar
                        onDayPress={(day) => setActivityDate(day.dateString)}
                        markedDates={{ [activityDate]: { selected: true } }}
                        initialDate={tripDetails.starts_at.toString()}
                        minDate={tripDetails.starts_at.toString()}
                        maxDate={tripDetails.ends_at.toString()}
                    />

                    <Button onPress={() => setShowModal(MODAL.NEW_ACTIVITY)}>
                        <Button.Title>Confirmar</Button.Title>
                    </Button>
                </View>
            </Modal>
        </View>
    )    
}