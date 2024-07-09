import { useEffect, useState } from "react";
import { Alert, Keyboard, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { type DateData } from "react-native-calendars";

import { CalendarRange, Info, MapPin, Settings2, Calendar as IconCalendar } from "lucide-react-native";

import { colors } from "@/styles/colors";
import { calendarUtils, type DatesSelected } from "@/utils/calendarUtils";

import { Loading } from "@/components/loading";
import { Input } from "@/components/input";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { TripActivities } from "./activities";
import { TripDetails as Details } from "./details";
import { Calendar } from "@/components/calendar";

import { tripServer, type TripDetails } from "@/server/trip-server";
import dayjs from "dayjs";

export type TripData = TripDetails & { when: string }

enum MODAL {
    NONE = 0,
    UPDATE_TRIP = 1,
    CALENDAR = 2,
}

export default function Trip() {
    // LOADING
    const [ isLoadingTrip, setIsLoadingTrip ] = useState(true)
    const [ isUpdatingTrip, setIsUpdatingTrip ] = useState(false)

    // MODAL
    const [ showModal, setShownModal ] = useState(0)

    // DATA
    const [tripDetails, setTripDetails] = useState({} as TripData)
    const [ option, setOption ] = useState<"activity" | "details">("activity")
    const [ destination, setDestination ] = useState("")
    const [ selectedDates, setSelectedDates ] = useState({} as DatesSelected)

    const tripId = useLocalSearchParams<{ id: string }>().id
    
    async function getTripDetails() {
        try {
            setIsLoadingTrip(true)

            if(!tripId) {
                return router.back()
            }

            const trip = await tripServer.getById(tripId)

            const maxLengthDestination = 12
            const destination = trip.destination.trim().length > maxLengthDestination
            ? trip.destination.slice(0, maxLengthDestination - 3) + "..."
            : trip.destination.trim()

            const starts_at = dayjs(trip.starts_at).format("DD")
            const ends_at = dayjs(trip.ends_at).format("DD")
            const month = dayjs(trip.starts_at).format("MMM")

            setDestination(trip.destination)
            
            setTripDetails({
                ...trip,
                when: `${destination} de ${starts_at} a ${ends_at} de ${month}.`
            })
        } catch (err) {
            console.log(err);
            
        } finally {
            setIsLoadingTrip(false)
        }
    }

    function handleSelectDate(selectedDay: DateData) {
        const dates = calendarUtils.orderStartsAtAndEndsAt({
            startsAt: selectedDates.startsAt,
            endsAt: selectedDates.endsAt,
            selectedDay
        })

        setSelectedDates(dates)
    }

    async function handleUpdateTrip() {
        try {
            if(!tripId) {
                return
            }
            if(!destination || !selectedDates.startsAt || !selectedDates.endsAt) {
                return Alert.alert("Atualizar viagem", "Lembre-se de, além de preencher o destino, selecione data de início e fim da viagem.")
            }

            setIsUpdatingTrip(true)

            await tripServer.update({
                id: tripId,
                destination,
                starts_at: dayjs(selectedDates.startsAt.dateString).toString(),
                ends_at: dayjs(selectedDates.endsAt.dateString).toString()
            })

            Alert.alert("Atualizar viagem", "Viagem atualizada com sucesso!", [
                {
                    text: 'OK',
                    onPress: () => {
                        setShownModal(MODAL.NONE),
                        getTripDetails()
                    },
                }
            ])
        } catch (err) {
            console.log(err);
        } finally {
            setIsLoadingTrip(false)
        }
    }

    useEffect(() => {
        getTripDetails()
    },[])

    if(isLoadingTrip) {
        return <Loading/>
    }

    return (
        <View className="flex-1 px-5 pt-16">
            <Input variant="tertiary">
                <MapPin color={colors.zinc[400]} size={20} />
                <Input.Field value= {tripDetails.when} readOnly />

                <TouchableOpacity
                    activeOpacity={0.5}
                    onPress={() => setShownModal(MODAL.UPDATE_TRIP)}
                >
                    <View className="w-9 h-9 bg-zinc-800 items-center justify-center rounded">
                        <Settings2 color={colors.zinc[400]} size={20} />
                    </View>
                </TouchableOpacity>
            </Input>

            { option === "activity" ? (
                <TripActivities tripDetails={tripDetails}/>
            ) : (
                <Details tripId={tripDetails.id}/>
            )}

            <View className="w-full absolute -bottom-1 self-center justify-end pb-5 z-10 bg-zinc-950">
                <View className="w-full flex-row bg-zinc-900 p-4 rounded-lg border border-zinc-800 gap-2">
                    <Button
                        className="flex-1"
                        onPress={() => setOption("activity")}
                        variant={option === "activity" ? "primary" : "secondary"}
                    >
                        <CalendarRange 
                            color={
                                option === "activity" ? colors.lime[950] : colors.zinc[200]
                            }
                            size={20}
                        />
                        <Button.Title>Atividades</Button.Title>
                    </Button>

                    <Button
                        className="flex-1"
                        onPress={() => setOption("details")}
                        variant={option === "details" ? "primary" : "secondary"}
                    >
                        <Info 
                            color={
                                option === "details" ? colors.lime[950] : colors.zinc[200]
                            }
                            size={20}
                        />
                        <Button.Title>Detalhes</Button.Title>
                    </Button>
                </View>
            </View>

            <Modal
                title="Atualizar viagem"
                subtitle="Somente quem criou a viagem pode editar."
                visible= {showModal === MODAL.UPDATE_TRIP}
                onClose={() => setShownModal(MODAL.NONE)}
            >
                <View className="gap-2 my-4">
                    <Input variant="secondary">
                        <MapPin color={colors.zinc[400]} size={20} />
                        <Input.Field
                            placeholder="Para onde?"
                            onChangeText={ setDestination }
                            value={ destination }
                        />
                    </Input>
                    <Input variant="secondary">
                        <IconCalendar color={colors.zinc[400]} size={20} />
                        <Input.Field
                            placeholder="Quando?"
                            value={ selectedDates.formatDatesInText }
                            onPressIn={() => setShownModal(MODAL.CALENDAR)}
                            onFocus={() => Keyboard.dismiss()}
                            
                        />
                    </Input>

                    <Button onPress={handleUpdateTrip} isLoading={isUpdatingTrip}>
                        <Button.Title>Atualizar</Button.Title>
                    </Button>
                </View>
            </Modal>

            <Modal
                title="Selecionar datas"
                subtitle="Selecione a data de ida e volta da viagem"
                visible= {showModal === MODAL.CALENDAR}
                onClose={() => setShownModal(MODAL.UPDATE_TRIP)}
            >
                <View className="gap-4 mt-4">
                    <Calendar 
                        minDate={dayjs().toISOString()}
                        onDayPress={ handleSelectDate }
                        markedDates={selectedDates.dates}
                    />
                    <Button className="w-full" onPress={() => setShownModal(MODAL.UPDATE_TRIP)}>
                        <Button.Title>Confirmar</Button.Title>
                    </Button>
                </View>
            </Modal>
        </View>
    )
}